/**
 * Child component of Settings/Profile/ renders the
 * 'Basic Info' page.
 */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable jsx-a11y/label-has-for */

import _ from 'lodash';
import React from 'react';
import PT from 'prop-types';
import moment from 'moment';
import fetch from 'isomorphic-fetch';
import { config } from 'topcoder-react-utils';
import { PrimaryButton } from 'topcoder-react-ui-kit';
import ConsentComponent from 'components/Settings/ConsentComponent';
import Select from 'components/Select';
import DatePicker from 'components/challenge-listing/Filters/DatePicker';
import ErrorMessage from 'components/Settings/ErrorMessage';
import ImageInput from '../ImageInput';
import Track from './Track';
import DefaultImageInput from './ImageInput';
import dropdowns from './dropdowns.json';
import tracks from './tracks';


import './styles.scss';

export default class BasicInfo extends ConsentComponent {
  constructor(props) {
    super(props);

    this.shouldDisableSave = this.shouldDisableSave.bind(this);
    this.onUpdateCountry = this.onUpdateCountry.bind(this);
    this.onUpdateSelect = this.onUpdateSelect.bind(this);
    this.onUpdateInput = this.onUpdateInput.bind(this);
    this.onUpdateDate = this.onUpdateDate.bind(this);
    this.onHandleSaveBasicInfo = this.onHandleSaveBasicInfo.bind(this);
    this.onSaveBasicInfo = this.onSaveBasicInfo.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onCheckFormValue = this.onCheckFormValue.bind(this);
    this.processBasicInfo = this.processBasicInfo.bind(this);

    const { userTraits } = props;
    this.state = {
      inputChanged: false,
      formInvalid: false,
      basicInfoTrait: this.loadBasicInfoTraits(userTraits),
      profile: {},
      personalizationTrait: this.loadPersonalizationTrait(userTraits),
      newProfileInfo: {
        firstName: null,
        lastName: null,
        tracks: [],
        status: null,
        addresses: [],
        description: '',
        email: null,
        homeCountryCode: null,
        competitionCountryCode: null,
        photoURL: null,
      },
      newBasicInfo: {
        gender: null,
        shortBio: '',
        tshirtSize: null,
        country: null,
        primaryInterestInTopcoder: null,
        currentLocation: null,
        birthDate: null,
      },
    };
  }

  componentDidMount() {
    const { basicInfoTrait } = this.state;
    const basicInfo = basicInfoTrait.traits ? basicInfoTrait.traits.data[0] : {};
    this.processBasicInfo(basicInfo, this.props.profile);
    this.setState({ profile: this.props.profile });
  }

  componentWillReceiveProps(nextProps) {
    const basicInfoTrait = this.loadBasicInfoTraits(nextProps.userTraits);

    const basicInfo = basicInfoTrait.traits ? basicInfoTrait.traits.data[0] : {};
    const previousBasicInfoTrait = this.loadBasicInfoTraits(this.props.userTraits);

    const personalizationTrait = this.loadPersonalizationTrait(nextProps.userTraits);
    if (!_.isEqual(basicInfoTrait, previousBasicInfoTrait)) {
      this.processBasicInfo(basicInfo, nextProps.profile);
      this.setState({
        basicInfoTrait,
        personalizationTrait,
        inputChanged: false,
      });
    }
    if (!_.isEqual(this.state.profile, nextProps.profile)) {
      this.processBasicInfo(basicInfo, nextProps.profile);
      this.setState({ profile: nextProps.profile });
    }
    if (nextProps.lookupData) {
      const { countries } = nextProps.lookupData;
      const { newBasicInfo, newProfileInfo } = this.state;
      if (!newBasicInfo.country) {
        const code = newProfileInfo.homeCountryCode || newProfileInfo.competitionCountryCode;
        const { country } = countries.find(c => c.countryCode === code) || {};
        newBasicInfo.country = country;
        this.setState({ newBasicInfo });
      }
    }
  }

  onCheckFormValue(newBasicInfo, newProfileInfo) {
    let invalid = false;

    if (!_.trim(newProfileInfo.firstName).length) {
      invalid = true;
    }

    if (!_.trim(newProfileInfo.lastName).length) {
      invalid = true;
    }

    if (!_.trim(newBasicInfo.country).length) {
      invalid = true;
    }

    if (!_.trim(newProfileInfo.description).length) {
      invalid = true;
    }

    if (_.trim(newBasicInfo.birthDate).length > 0) {
      if (!moment().isAfter(newBasicInfo.birthDate)) {
        invalid = true;
      }
    }

    this.setState({ formInvalid: invalid });
    return invalid;
  }

  async onCheckUserTrait(traitId) {
    const { handle, tokenV3 } = this.props;
    let isExists = false;
    await fetch(`${config.API.V5}/members/${handle}/traits?traitIds=${traitId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenV3}`,
      },
    })
      .then(result => result.json())
      .then((dataResponse) => {
        if (dataResponse.length > 0) {
          const trait = dataResponse[0];
          if (trait.createdAt) {
            isExists = true;
          }
        }
      });

    return isExists;
  }

  /**
   * Show User Consent Modal
   * @param {*} e event
   */
  onHandleSaveBasicInfo(e) {
    e.preventDefault();
    this.setState({ isSaving: true, inputChange: true });
    const { newBasicInfo, newProfileInfo } = this.state;
    if (this.onCheckFormValue(newBasicInfo, newProfileInfo)) {
      this.setState({ isSaving: false });
      return;
    }
    this.showConsent(this.onSaveBasicInfo.bind(this));
  }

  /**
   * Save Basic Info
   * @param answer user consent answer value
   */
  async onSaveBasicInfo(answer) {
    const {
      newBasicInfo, newProfileInfo, basicInfoTrait, personalizationTrait,
    } = this.state;
    const {
      handle,
      tokenV3,
      addUserTrait,
      updateUserTrait,
      updateProfileV5,
      profile,
    } = this.props;
    try {
      const parsedDate = moment(newBasicInfo.birthDate).utc();
      if (parsedDate.isValid()) {
        newBasicInfo.birthDate = `${parsedDate.format('YYYY-MM-DD')}T00:00:00.000Z`;
      } else {
        newBasicInfo.birthDate = null;
      }
    } catch (error) { // eslint-disable-line
      newBasicInfo.birthDate = null;
    }

    if (newBasicInfo.gender === '') {
      newBasicInfo.gender = null;
    }

    if (newBasicInfo.tshirtSize === '') {
      newBasicInfo.tshirtSize = null;
    }

    _.forEach(newProfileInfo.addresses[0], (value, key) => {
      newProfileInfo.addresses[0][key] = _.trim(value);
    });
    _.forEach(['currentLocation', 'primaryInterestInTopcoder'], (key) => {
      newBasicInfo[key] = _.trim(newBasicInfo[key]);
    });
    _.forEach(['description'], (key) => {
      newProfileInfo[key] = _.trim(newProfileInfo[key]);
    });
    // This is a hack to check if the user has an existing basic_info trait object
    const exists = await this.onCheckUserTrait('basic_info');
    if (exists) {
      const newBasicInfoTrait = { ...basicInfoTrait };
      newBasicInfoTrait.traits.data = [];
      newBasicInfoTrait.traits.data.push(newBasicInfo);
      await updateUserTrait(handle, 'basic_info', newBasicInfoTrait.traits.data, tokenV3);
    } else {
      const data = [];
      data.push(newBasicInfo);
      await addUserTrait(handle, 'basic_info', data, tokenV3);
    }

    // save personalization
    if (_.isEmpty(personalizationTrait)) {
      const personalizationData = { userConsent: answer };
      await addUserTrait(handle, 'personalization', [personalizationData], tokenV3);
    } else {
      const trait = personalizationTrait.traits.data[0];
      if (trait.userConsent !== answer) {
        const personalizationData = { userConsent: answer };
        await updateUserTrait(handle, 'personalization', [personalizationData], tokenV3);
      }
    }

    const updateProfileData = {
      ...newProfileInfo,
    };
    updateProfileData.addresses.forEach((address, idx) => {
      if (!address.createdAt) {
        updateProfileData.addresses[idx].createdAt = new Date();
      }
      if (!address.updatedAt) {
        updateProfileData.addresses[idx].updatedAt = new Date();
      }
      if (!address.createdBy) {
        updateProfileData.addresses[idx].createdBy = profile.handle;
      }
      if (!address.updatedBy) {
        updateProfileData.addresses[idx].updatedBy = profile.handle;
      }
    });
    await updateProfileV5(updateProfileData, handle, tokenV3);

    this.setState({ isSaving: false });
  }

  onUpdateSelect(option) {
    if (option) {
      const { newBasicInfo: oldBasicInfo } = this.state;
      const newBasicInfo = { ...oldBasicInfo };
      newBasicInfo[option.key] = option.name;
      this.setState({ newBasicInfo, inputChanged: true });
    }
  }

  onUpdateInput(e) {
    const { newBasicInfo: oldBasicInfo, newProfileInfo: oldProfileInfo } = this.state;
    const newBasicInfo = { ...oldBasicInfo };
    const newProfileInfo = { ...oldProfileInfo };
    const { name, value } = e.target;
    switch (name) {
      case 'stateCode':
      case 'zip':
      case 'city':
      case 'streetAddr1':
      case 'streetAddr2':
        if (newProfileInfo.addresses.length === 0) {
          newProfileInfo.addresses.push({
            stateCode: '',
            zip: '',
            city: '',
            streetAddr1: '',
            streetAddr2: '',
          });
        }
        newProfileInfo.addresses[0][name] = value;
        break;
      case 'firstName':
      case 'lastName':
        newProfileInfo[name] = value.replace(/[^a-zA-Z0-9,. -]/g, '');
        break;
      default:
        if (name in newProfileInfo) {
          newProfileInfo[name] = value;
        } else if (name in newBasicInfo) {
          newBasicInfo[name] = value;
        }
    }

    this.setState({ newBasicInfo, newProfileInfo, inputChanged: true });
  }

  onUpdateDate(date) {
    if (date) {
      const { newBasicInfo: oldBasicInfo } = this.state;
      const newBasicInfo = { ...oldBasicInfo };
      newBasicInfo.birthDate = date;
      this.setState({ newBasicInfo, inputChanged: true });
    }
  }

  onUpdateCountry(country) {
    if (country) {
      const { newBasicInfo: oldBasicInfo } = this.state;
      const newBasicInfo = { ...oldBasicInfo };
      newBasicInfo.country = country.name;
      newBasicInfo.competitionCountryCode = country.key;
      newBasicInfo.homeCountryCode = country.key;
      this.setState({ newBasicInfo, inputChanged: true });
    }
  }

  /**
   * Change toggle button check value
   * @param id community id
   * @param checked check value
   */
  onChange(id, checked) {
    const { newProfileInfo } = this.state;
    if (checked) {
      newProfileInfo.tracks.push(id.toUpperCase());
    } else {
      _.remove(newProfileInfo.tracks, track => (
        track.toUpperCase() === id.toUpperCase()
      ));
    }
    this.setState({ newProfileInfo, inputChanged: true });
  }

  /**
   * Get basic info trait
   * @param userTraits the all user traits
   */
  loadBasicInfoTraits = (userTraits) => {
    const trait = userTraits.filter(t => t.traitId === 'basic_info');
    const basicInfo = trait.length === 0 ? {} : trait[trait.length - 1];
    return _.assign({}, basicInfo);
  }

  /**
   * Get personalization trait
   * @param userTraits the all user traits
   */
  loadPersonalizationTrait = (userTraits) => {
    const trait = userTraits.filter(t => t.traitId === 'personalization');
    const personalization = trait.length === 0 ? {} : trait[0];
    return _.assign({}, personalization);
  }

  /**
   * Process basic info state
   */
  processBasicInfo = (value, profile) => {
    const { newBasicInfo, newProfileInfo: profileInfo } = this.state;
    if (_.has(profile, 'handle')) {
      const newProfileInfo = Object.keys(profileInfo).reduce((acc, key) => {
        if (_.has(profileInfo, key)) {
          acc[key] = profile[key] || profileInfo[key];
        }
        return acc;
      }, {});
      const basicInfo = Object.keys(newBasicInfo).reduce((acc, key) => {
        if (_.has(value, key)) {
          acc[key] = value[key];
          newBasicInfo[key] = value[key];
        }
        return acc;
      }, {});
      this.setState({ newBasicInfo: basicInfo, newProfileInfo });
    }
  }

  /**
   * Check form validation
   * @returns {boolean}
   */
  shouldDisableSave() {
    const { newBasicInfo, inputChanged, newProfileInfo } = this.state;

    const { addresses } = newProfileInfo;

    const invalid = !_.trim(newProfileInfo.firstName).length
      || !_.trim(newProfileInfo.lastName).length
      || !_.trim(newProfileInfo.description).length
      || !_.trim(newBasicInfo.gender).length
      || !_.trim(newBasicInfo.tshirtSize).length
      || !_.trim(newBasicInfo.country).length
      || !_.trim(newBasicInfo.primaryInterestInTopcoder).length
      || !_.trim(newBasicInfo.currentLocation).length
      || !_.trim(newBasicInfo.birthDate).length
      || (addresses.length > 0 && !_.trim(addresses[0].city).length)
      || (addresses.length > 0 && !_.trim(addresses[0].stateCode).length)
      || (addresses.length > 0 && !_.trim(addresses[0].zip).length)
      || (addresses.length > 0
        && !_.trim(addresses[0].streetAddr1).length);

    // Invalid value, can not save
    if (invalid) {
      return true;
    }

    // Value not changed, no need save
    return inputChanged === false;
  }

  render() {
    const {
      newBasicInfo,
      newProfileInfo,
      inputChanged,
    } = this.state;

    const canModifyTrait = !this.props.traitRequestCount;
    const { lookupData } = this.props;
    const countries = _.get(lookupData, 'countries', []).map(country => ({
      key: country.countryCode,
      name: country.country,
    }));

    return (
      <div styleName="basic-info-container">
        {
          this.shouldRenderConsent() && this.renderConsent()
        }
        <h1>
          Basic Info
        </h1>
        <div styleName="sub-title first">
          Avatar
        </div>
        <div styleName="user-icon">
          <DefaultImageInput
            {...this.props}
          />
        </div>
        <div styleName="sub-title second">
          Personal details
        </div>
        <div styleName="form-container-default">
          <form name="basic-info-form" noValidate autoComplete="off">
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="firstName">
                  First name
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <span styleName="text-required">* Required</span>
                <input disabled={!canModifyTrait} id="firstName" name="firstName" type="text" placeholder="First Name" onChange={this.onUpdateInput} value={newProfileInfo.firstName} maxLength="64" required />
                <ErrorMessage invalid={_.isEmpty(newProfileInfo.firstName) && !_.isNull(newProfileInfo.firstName) && inputChanged} message="First Name cannot be empty" />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="lastName">
                  Last name
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <span styleName="text-required">* Required</span>
                <input disabled={!canModifyTrait} id="lastName" name="lastName" type="text" placeholder="Last Name" onChange={this.onUpdateInput} value={newProfileInfo.lastName} maxLength="64" required />
                <ErrorMessage invalid={_.isEmpty(newProfileInfo.lastName) && !_.isNull(newProfileInfo.lastName) && inputChanged} message="Last Name cannot be empty" />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="birthDate">
                  Birth Date
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">

                <div styleName="date-picker">
                  <DatePicker
                    readOnly
                    numberOfMonths={1}
                    isOutsideRange={moment()}
                    date={newBasicInfo.birthDate}
                    id="date-range-picker1"
                    onDateChange={this.onUpdateDate}
                  />
                </div>
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="address">
                  Address
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="address" name="streetAddr1" type="text" placeholder="Your address" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 && newProfileInfo.addresses[0].streetAddr1 != null ? newProfileInfo.addresses[0].streetAddr1 : ''}`} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="address2">
                  Address 2
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="address" name="streetAddr2" type="text" styleName="second-addr" placeholder="Your address continued" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 && newProfileInfo.addresses[0].streetAddr2 != null ? newProfileInfo.addresses[0].streetAddr2 : ''}`} maxLength="64" />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="city">
                  City
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="city" name="city" type="text" placeholder="Which city do you live in?" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 && newProfileInfo.addresses[0].city != null ? newProfileInfo.addresses[0].city : ''}`} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="state">
                  State
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="state" name="stateCode" type="text" placeholder="State" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 && newProfileInfo.addresses[0].stateCode != null ? newProfileInfo.addresses[0].stateCode : ''}`} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="zipCode">
                  ZIP
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="zipCode" name="zip" type="text" placeholder="ZIP/Postal Code" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 && newProfileInfo.addresses[0].zip != null ? newProfileInfo.addresses[0].zip : ''}`} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="country">
                  Country
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <span styleName="text-required">* Required</span>
                <Select
                  name="country"
                  options={countries}
                  value={newBasicInfo.country}
                  onChange={this.onUpdateCountry}
                  placeholder="Country"
                  matchPos="start"
                  matchProp="name"
                  labelKey="name"
                  valueKey="name"
                  disabled={!canModifyTrait}
                  clearable={false}
                />
                <ErrorMessage invalid={_.isEmpty(newBasicInfo.country) && inputChanged} message="Country cannot be empty" addMargin />
              </div>
            </div>
          </form>
        </div>
        <div styleName="sub-title second">
          About you
        </div>
        <div styleName="form-container-default">
          <form name="basic-info-form" noValidate autoComplete="off">
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="gender">
                  Gender
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <Select
                  name="gender"
                  options={dropdowns.gender}
                  value={newBasicInfo.gender}
                  onChange={this.onUpdateSelect}
                  placeholder="Gender"
                  labelKey="name"
                  valueKey="name"
                  clearable={false}
                  disabled={!canModifyTrait}
                />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="tshirtSize">
                  T-shirt size
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <Select
                  name="tshirtSize"
                  options={dropdowns.tshirtSize}
                  value={newBasicInfo.tshirtSize}
                  onChange={this.onUpdateSelect}
                  placeholder="Select your size from the list"
                  labelKey="name"
                  valueKey="name"
                  clearable={false}
                  disabled={!canModifyTrait}
                />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="currentLocation">
                  Current Location
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="currentLocation" name="currentLocation" type="text" placeholder="Where in the world are you currently?" onChange={this.onUpdateInput} value={newBasicInfo.currentLocation} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="primaryInterestInTopcoder">
                  Primary interests
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field col-2">
                <input disabled={!canModifyTrait} id="primaryInterestInTopcoder" name="primaryInterestInTopcoder" type="text" placeholder="primary Interest In Topcoder" onChange={this.onUpdateInput} value={newBasicInfo.primaryInterestInTopcoder} maxLength="64" required />
              </div>
            </div>
            <div styleName="row">
              <div styleName="field col-1">
                <label htmlFor="bio">
                  Short bio
                  <input type="hidden" />
                </label>
              </div>
              <div styleName="field description">
                <div styleName="first-line">
                  <span styleName="description-counts">
                    {newProfileInfo.description.length}/240
                  </span>
                </div>
                <textarea disabled={!canModifyTrait} id="description" styleName="bio-text" name="description" placeholder="In 240 characters or less, tell the Topcoder community a bit about yourself" onChange={this.onUpdateInput} value={newProfileInfo.description} maxLength="240" cols="3" rows="10" />
                <ErrorMessage invalid={_.isEmpty(newProfileInfo.description) && inputChanged} message="Short bio cannot be empty" addMargin />
              </div>
            </div>
          </form>
        </div>
        <div styleName="about-me-container-mobile">
          <div styleName="user-icon">
            <ImageInput
              {...this.props}
            />
          </div>
          <div styleName="form-container">
            <p styleName="handle">
              {newBasicInfo.handle}
            </p>
            <div styleName="mb-user-card">
              <ImageInput
                {...this.props}
              />
            </div>
            <form name="BasicInfoForm" noValidate autoComplete="off">
              <div styleName="user-card">
                <div styleName="img-container">
                  <ImageInput
                    {...this.props}
                  />
                </div>
                <div styleName="main">
                  <p styleName="user-handle">
                    {newBasicInfo.handle}
                  </p>
                  <div styleName="row">
                    <div styleName="field">
                      <label htmlFor="firstNameId">
                        First name
                        <span styleName="text-required">* Required</span>
                        <input type="hidden" />
                      </label>

                      <input disabled={!canModifyTrait} id="firstNameId" name="firstName" type="text" placeholder="First Name" onChange={this.onUpdateInput} value={newProfileInfo.firstName} maxLength="64" required />
                      <ErrorMessage invalid={_.isEmpty(newProfileInfo.firstName) && inputChanged} addMargin message="First Name cannot be empty" />
                    </div>
                    <div styleName="field">
                      <label htmlFor="lastNameId">
                        Last name
                        <span styleName="text-required">* Required</span>
                        <input type="hidden" />
                      </label>
                      <input disabled={!canModifyTrait} id="lastNameId" name="lastName" type="text" placeholder="Last Name" onChange={this.onUpdateInput} value={newProfileInfo.lastName} maxLength="64" required />
                      <ErrorMessage invalid={_.isEmpty(newProfileInfo.lastName) && inputChanged} addMargin message="Last Name cannot be empty" />
                    </div>
                  </div>
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="birthDate">
                    Birth Date
                    <input type="hidden" />
                  </label>
                  <div styleName="date-picker-sm">
                    <DatePicker
                      readOnly
                      numberOfMonths={1}
                      isOutsideRange={moment()}
                      date={newBasicInfo.birthDate}
                      id="date-range-picker2"
                      onDateChange={this.onUpdateDate}
                    />
                  </div>
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="addressId">
                    Address
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="addressId" name="streetAddr1" type="text" placeholder="Address Line 1" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 ? newProfileInfo.addresses[0].streetAddr1 : ''}`} maxLength="64" required />
                  <input disabled={!canModifyTrait} id="addressId" name="streetAddr2" type="text" styleName="second-addr" placeholder="Address Line 2  " onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 ? newProfileInfo.addresses[0].streetAddr2 : ''}`} maxLength="64" />
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="cityId">
                    City
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="cityId" name="city" type="text" placeholder="city" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 ? newProfileInfo.addresses[0].city : ''}`} maxLength="64" required />
                </div>
                <div styleName="field">
                  <label htmlFor="stateId">
                    State
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="stateId" name="stateCode" type="text" placeholder="state" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 ? newProfileInfo.addresses[0].stateCode : ''}`} maxLength="64" required />
                </div>
                <div styleName="field">
                  <label htmlFor="zipCodeId">
                    ZIP Code
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="zipCodeId" name="zip" type="text" placeholder="zipCode" onChange={this.onUpdateInput} value={`${newProfileInfo.addresses.length > 0 ? newProfileInfo.addresses[0].zip : ''}`} maxLength="64" required />
                </div>
                <div styleName="field">
                  <label htmlFor="countryId">
                    Country
                    <span styleName="text-required">* Required</span>
                    <input type="hidden" />
                  </label>
                  <Select
                    name="countryId"
                    options={countries}
                    value={newBasicInfo.country}
                    onChange={this.onUpdateCountry}
                    placeholder="Country"
                    matchPos="start"
                    matchProp="name"
                    labelKey="name"
                    valueKey="name"
                    clearable={false}
                    disabled={!canModifyTrait}
                  />
                  <ErrorMessage invalid={_.isEmpty(newBasicInfo.country) && inputChanged} message="Country cannot be empty" />
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="gender">
                    Gender
                    <input type="hidden" />
                  </label>
                  <Select
                    name="gender"
                    options={dropdowns.gender}
                    value={newBasicInfo.gender}
                    onChange={this.onUpdateSelect}
                    placeholder="Gender"
                    labelKey="name"
                    valueKey="name"
                    clearable={false}
                    disabled={!canModifyTrait}
                  />
                </div>
                <div styleName="field">
                  <label htmlFor="tshirtSize">
                    T-Shirt-Size
                    <input type="hidden" />
                  </label>
                  <Select
                    name="tshirtSize"
                    options={dropdowns.tshirtSize}
                    value={newBasicInfo.tshirtSize}
                    onChange={this.onUpdateSelect}
                    placeholder="t-shirt Size"
                    labelKey="name"
                    valueKey="name"
                    clearable={false}
                    disabled={!canModifyTrait}
                  />
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="currentLocation">
                    Current Location
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="currentLocation" name="currentLocation" type="text" placeholder="current Location" onChange={this.onUpdateInput} value={newBasicInfo.currentLocation} maxLength="64" required />
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label htmlFor="primaryInterestInTopcoder">
                    Primary Interest in Topcoder
                    <input type="hidden" />
                  </label>
                  <input disabled={!canModifyTrait} id="primaryInterestInTopcoder" name="primaryInterestInTopcoder" type="text" placeholder="primary Interest In Topcoder" onChange={this.onUpdateInput} value={newBasicInfo.primaryInterestInTopcoder} maxLength="64" required />
                </div>
              </div>
              <div styleName="row">
                <div styleName="field">
                  <label styleName="bio-label" htmlFor="description">
                    <span>
                      Short Bio
                    </span>
                    <span>
                      {newProfileInfo.description.length}/240
                    </span>
                  </label>
                  <textarea disabled={!canModifyTrait} id="description" styleName="bio-text" name="description" placeholder="short Bio" onChange={this.onUpdateInput} value={newProfileInfo.description} maxLength="240" cols="3" rows="10" required />
                </div>
              </div>
            </form>
          </div>
        </div>
        <div styleName="tracks-container">
          <div styleName="title-info">
            <div styleName="title">
              Tracks
            </div>
            <p styleName="description">
              Topcoder&apos;s three categories of challenges... please pick at
              least one based on your skills and interests.
            </p>
          </div>
          <div styleName="track-list">
            {
              _.map(tracks, (track) => {
                const result = newProfileInfo.tracks.filter(item => (
                  item.toUpperCase() === track.id.toUpperCase()
                ));
                const checked = result.length !== 0;
                return (
                  <Track
                    icon={track.icon}
                    key={track.id}
                    id={track.id}
                    value={track.id}
                    checked={checked}
                    title={track.name}
                    description={track.description}
                    onToggle={event => this.onChange(track.id, event.target.checked)}
                  />
                );
              })
            }
          </div>
        </div>
        <div styleName="button-save">
          <PrimaryButton
            styleName="white-label"
            disabled={!canModifyTrait}
            onClick={this.onHandleSaveBasicInfo}
          >
            Save Changes
          </PrimaryButton>
        </div>
      </div>
    );
  }
}

BasicInfo.propTypes = {
  tokenV3: PT.string.isRequired,
  handle: PT.string.isRequired,
  profile: PT.shape().isRequired,
  userTraits: PT.array.isRequired,
  addUserTrait: PT.func.isRequired,
  updateUserTrait: PT.func.isRequired,
  updateProfileV5: PT.func.isRequired,
  traitRequestCount: PT.number.isRequired,
};
